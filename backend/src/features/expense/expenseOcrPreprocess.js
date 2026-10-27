import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { writeHeaderBand } from '../personalExpense/ocr/headerBand.js';

const TARGET_WIDTH = 2000;
const DARK_MEAN_LUMINANCE = 110;

/**
 * Prepares phone photos and receipts for Tesseract:
 * 1. Auto-rotates using EXIF orientation (.rotate())
 * 2. Flattens alpha to clean white background
 * 3. Converts to grayscale (.grayscale())
 * 4. Normalizes width to ~2000px for optimal 300dpi Tesseract character recognition
 * 5. Normalizes contrast (.normalize())
 * 6. Applies median noise reduction (.median(1))
 * 7. Sharpens character edges (.sharpen())
 * 8. Detects dark-mode screenshots and negates light-on-dark text
 *
 * Returns temp-file variants in the order they should be tried.
 */
export async function buildOcrVariants(filePath) {
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    return { variants: [], cleanup: async () => {} };
  }

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'expense-ocr-'));
  const cleanup = async () => {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  };

  try {
    const meta = await sharp(filePath, { failOn: 'none' }).rotate().metadata();
    const currentWidth = meta.autoOrient?.width || meta.width || TARGET_WIDTH;
    const currentHeight = meta.autoOrient?.height || meta.height || 0;
    const isScreenshot = currentHeight >= currentWidth * 1.35;
    const targetWidth = Math.min(3000, Math.max(1800, currentWidth < 1800 ? TARGET_WIDTH : currentWidth));

    const base = () =>
      sharp(filePath, { failOn: 'none' })
        .rotate()
        .flatten({ background: '#ffffff' })
        .grayscale()
        .resize({ width: targetWidth, withoutEnlargement: false })
        .normalize()
        .sharpen({ sigma: 1, m1: 1.2, m2: 0.5 });

    const { channels } = await base().stats();
    const dark = (channels[0]?.mean ?? 255) < DARK_MEAN_LUMINANCE;

    const enhanced = path.join(dir, 'enhanced.png');
    let pipeline = base();
    if (dark) pipeline = pipeline.negate();
    await pipeline.png().toFile(enhanced);

    const grayscaleClean = path.join(dir, 'clean-grayscale.png');
    let cleanPipe = sharp(filePath, { failOn: 'none' })
      .rotate()
      .flatten({ background: '#ffffff' })
      .grayscale();
    if (!isScreenshot) {
      cleanPipe = cleanPipe.resize({ width: targetWidth, withoutEnlargement: false }).sharpen();
    }
    if (dark) cleanPipe = cleanPipe.negate();
    await cleanPipe.png().toFile(grayscaleClean);

    // Light documents often have a white-on-black band (e.g. a TOTAL bar) that Tesseract skips.
    let inverted = null;
    if (!dark) {
      const invertedPath = path.join(dir, 'inverted.png');
      await base().negate().png().toFile(invertedPath);
      inverted = { label: 'inverted', path: invertedPath };
    }

    const header = await writeHeaderBand(sharp, dark ? base().negate() : base(), dir);

    // Shared screenshots often include a messaging-app viewer above and below the
    // actual payment proof. A focused pass avoids those controls competing with
    // the prominent amount and payee in the centre of a tall phone screenshot.
    let contentCrop = null;
    let paymentAmountCrop = null;
    if (isScreenshot) {
      const cropPath = path.join(dir, 'screen-content.png');
      const cropTop = Math.round(currentHeight * 0.05);
      const cropHeight = Math.round(currentHeight * 0.90);
      let cropPipe = sharp(filePath, { failOn: 'none' })
        .rotate()
        .extract({ left: 0, top: cropTop, width: currentWidth, height: cropHeight })
        .flatten({ background: '#ffffff' })
        .grayscale()
        .sharpen({ sigma: 0.5 });
      if (dark) cropPipe = cropPipe.negate();
      await cropPipe.png().toFile(cropPath);
      contentCrop = { label: 'screen-content', path: cropPath };

      const amountPath = path.join(dir, 'payment-amount.png');
      const amountTop = Math.round(currentHeight * 0.22);
      const amountHeight = Math.round(currentHeight * 0.35);
      let amountPipe = sharp(filePath, { failOn: 'none' })
        .rotate()
        .extract({ left: 0, top: amountTop, width: currentWidth, height: amountHeight })
        .flatten({ background: '#ffffff' })
        .grayscale()
        .sharpen({ sigma: 0.5 });
      if (dark) amountPipe = amountPipe.negate();
      await amountPipe.png().toFile(amountPath);
      paymentAmountCrop = { label: 'payment-amount', path: amountPath };
    }

    return {
      header,
      variants: [
        { label: dark ? 'enhanced-inverted' : 'enhanced', path: enhanced },
        { label: 'clean-grayscale', path: grayscaleClean },
        ...(contentCrop ? [contentCrop] : []),
        ...(paymentAmountCrop ? [paymentAmountCrop] : []),
      ],
      inverted,
      cleanup,
    };
  } catch {
    await cleanup();
    return { variants: [], cleanup: async () => {} };
  }
}
