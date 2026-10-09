const MAX_SIDE = 512;
const KEEP_AS_IS_BYTES = 300 * 1024;

/**
 * Reads a logo the person picked and returns it as a data URL ready to
 * send to the server. Large images are scaled down to 512px on the
 * longest side (as PNG, so a transparent background is kept), so a
 * photo straight from a phone still fits. Rejects with a message for
 * the person.
 */
export function readLogoFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      reject(new Error('The logo must be a PNG, JPEG or WEBP image.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('That file could not be read.'));
    reader.onload = () => {
      const original = String(reader.result);
      const image = new Image();
      image.onerror = () => reject(new Error('That file is not an image we can use.'));
      image.onload = () => {
        const scale = Math.min(1, MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
        if (scale === 1 && file.size <= KEEP_AS_IS_BYTES) { resolve(original); return; }
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext('2d');
        if (!context) { resolve(original); return; }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      };
      image.src = original;
    };
    reader.readAsDataURL(file);
  });
}
