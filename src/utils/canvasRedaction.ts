export interface RedactionBox {
  /** Normalized 0..1 coordinates relative to image width/height */
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Default redaction zone covering the top demographic header strip where
 * clinical lab reports print Patient Name, Phone, DOB, and MRN.
 */
export const DEFAULT_HEADER_MASK_PERCENT = 18;

/**
 * Renders an uploaded lab report image onto an offscreen HTML5 Canvas,
 * draws opaque client-side redaction masks over the header and any custom boxes,
 * and returns a sanitized PNG data URL and base64 payload.
 */
export async function applyClientSideImageRedaction(
  sourceDataUrl: string,
  options: {
    redactHeader: boolean;
    headerMaskPercent: number;
    customBoxes?: RedactionBox[];
  }
): Promise<{ dataUrl: string; base64Data: string; mimeType: string }> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not decode the uploaded image file.'));
    image.src = sourceDataUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Browser canvas is unavailable for client-side redaction.');
  }

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const drawPrivacyMask = (x: number, y: number, w: number, h: number, label: string) => {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = '#e2e8f0';
    const fontSize = Math.max(12, Math.min(24, Math.round(h * 0.28)));
    ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2);
  };

  if (options.redactHeader && options.headerMaskPercent > 0) {
    const maskHeight = Math.round((canvas.height * options.headerMaskPercent) / 100);
    drawPrivacyMask(
      0,
      0,
      canvas.width,
      maskHeight,
      'PATIENT IDENTIFIERS REDACTED LOCALLY'
    );
  }

  if (options.customBoxes && options.customBoxes.length > 0) {
    for (const box of options.customBoxes) {
      drawPrivacyMask(
        Math.round(box.x * canvas.width),
        Math.round(box.y * canvas.height),
        Math.round(box.width * canvas.width),
        Math.round(box.height * canvas.height),
        'REDACTED'
      );
    }
  }

  const outputMime = 'image/png';
  const dataUrl = canvas.toDataURL(outputMime);
  const base64Data = dataUrl.split(',')[1] ?? '';

  return { dataUrl, base64Data, mimeType: outputMime };
}
