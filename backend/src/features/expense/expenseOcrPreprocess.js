import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

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
    const targetWidth = Math.min(3000, Math.max(1800, currentWidth < 1800 ? TARGET_WIDTH : currentWidth));

    const base = () =>
      sharp(filePath, { failOn: 'none' })
        .rotate()
        .flatten({ background: '#ffffff' })
        .grayscale()
        .resize({ width: targetWidth, withoutEnlargement: false })
        .normalize()
        .median(1)
        .sharpen();

    const { channels } = await base().stats();
    const dark = (channels[0]?.mean ?? 255) < DARK_MEAN_LUMINANCE;

    const enhanced = path.join(dir, 'enhanced.png');
    let pipeline = base();
    if (dark) pipeline = pipeline.negate();
    await pipeline.png().toFile(enhanced);

    const binary = path.join(dir, 'binary.png');
    let binaryPipeline = base();
    if (dark) binaryPipeline = binaryPipeline.negate();
    await binaryPipeline.threshold(150).png().toFile(binary);

    // Light documents often have a white-on-black band (e.g. a TOTAL bar) that Tesseract skips.
    let inverted = null;
    if (!dark) {
      const invertedPath = path.join(dir, 'inverted.png');
      await base().negate().png().toFile(invertedPath);
      inverted = { label: 'inverted', path: invertedPath };
    }

    return {
      variants: [
        { label: dark ? 'enhanced-inverted' : 'enhanced', path: enhanced },
        { label: 'binary', path: binary },
      ],
      inverted,
      cleanup,
    };
  } catch {
    await cleanup();
    return { variants: [], cleanup: async () => {} };
  }
}
