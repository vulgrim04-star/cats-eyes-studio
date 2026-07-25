/** Redimensionne un fichier image et renvoie un <canvas> prêt à être exporté. */
function fileToResizedCanvas(file, maxSize) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Lecture du fichier impossible'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Image invalide'));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Convertit un fichier image en Blob JPEG redimensionné — à préférer pour tout ce qui
 * part vers Supabase Storage : un Blob pèse ~33 % de moins que la même image en data URL
 * base64, et n'a pas besoin d'être décodé pour être téléversé.
 */
export async function fileToResizedBlob(file, maxSize = 900, quality = 0.8) {
  const canvas = await fileToResizedCanvas(file, maxSize);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Conversion impossible'))),
      'image/jpeg',
      quality
    );
  });
}

/**
 * Convertit un fichier image en data URL redimensionnée (max 900px, JPEG qualité 0.8).
 * Conservé pour le logo et les signatures, qui restent stockés en ligne car ils sont
 * petits et intégrés directement dans les PDF signés.
 */
export function fileToResizedDataUrl(file, maxSize = 900) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Lecture du fichier impossible'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Image invalide'));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
