const MAX_SIDE = 512;
const KEEP_AS_IS_BYTES = 300 * 1024;

function readImageFile(file: File, { label, maxSide, keepAsIsBytes, outputType, quality, allowedTypes }: {
  label: string;
  maxSide: number;
  keepAsIsBytes: number;
  outputType: 'image/png' | 'image/jpeg';
  quality?: number;
  allowedTypes: string[];
}): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!allowedTypes.includes(file.type)) {
      reject(new Error(`${label} must be a PNG, JPEG, WEBP or GIF image.`));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`That ${label.toLowerCase()} file could not be read.`));
    reader.onload = () => {
      const original = String(reader.result);
      const image = new Image();
      image.onerror = () => reject(new Error(`That file is not an image we can use for the ${label.toLowerCase()}.`));
      image.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
        if (scale === 1 && file.size <= keepAsIsBytes) { resolve(original); return; }
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext('2d');
        if (!context) { reject(new Error(`The ${label.toLowerCase()} could not be resized.`)); return; }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL(outputType, quality));
      };
      image.src = original;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Reads a logo the person picked and returns it as a data URL ready to
 * send to the server. Large images are scaled down to 512px on the
 * longest side (as PNG, so a transparent background is kept), so a
 * photo straight from a phone still fits. Rejects with a message for
 * the person.
 */
export function readLogoFile(file: File): Promise<string> {
  return readImageFile(file, { label: 'Logo', maxSide: MAX_SIDE, keepAsIsBytes: KEEP_AS_IS_BYTES, outputType: 'image/png', allowedTypes: ['image/png', 'image/jpeg', 'image/webp'] });
}

/** Resizes camera photos before upload so their base64 JSON stays below the API limit. */
export function readPhotoFile(file: File): Promise<string> {
  return readImageFile(file, {
    label: 'Photo', maxSide: 1024, keepAsIsBytes: 900 * 1024,
    outputType: 'image/jpeg', quality: 0.86,
    allowedTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
  });
}
