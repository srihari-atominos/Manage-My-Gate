import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { writeHeaderBand } from './headerBand.js';

const MIN_TARGET_WIDTH = 1800;
const OPTIMAL_TARGET_WIDTH = 2200;
const MAX_TARGET_WIDTH = 3000;
const DARK_MEAN_LUMINANCE = 110;

/**
 * Image Preprocessing for Receipts & Payment Proofs:
 * 1. Auto-rotates using EXIF orientation metadata (.rotate()).
 * 2. Flattens alpha transparency onto a solid white background.
 * 3. Normalizes resolution: upscales small receipts (<1800px) and clamps oversized photos (>3000px).
 * 4. Generates conditional variants tailored to document types:
 *    - Enhanced (Grayscale + CLAHE local contrast + gentle sharpen): optimal for general invoices.
 *    - Thermal / Faded (Contrast-enhanced with CLAHE for low-contrast thermal receipts).
 *    - Inverted (For dark-mode UPI payment screenshots where text is light on dark background).
 *    - High-detail grayscale (Clean grayscale preserving thin decimal points & commas).
 * 5. Does NOT overwrite or mutate the original receipt file. All variants are stored in a secure temp directory.
 */
export async function buildReceiptVariants(filePath) {
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    return { variants: [], cleanup: async () => {} };
  }

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'nahom-ocr-'));
  const cleanup = async () => {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  };

  try {
    const meta = await sharp(filePath, { failOn: 'none' }).rotate().metadata();
    const currentWidth = meta.width || OPTIMAL_TARGET_WIDTH;
    const targetWidth = Math.min(
      MAX_TARGET_WIDTH,
      Math.max(MIN_TARGET_WIDTH, currentWidth < MIN_TARGET_WIDTH ? OPTIMAL_TARGET_WIDTH : currentWidth)
    );

    // Base pipeline: EXIF rotation, alpha flatten, grayscale, scaled width
    const base = () =>
      sharp(filePath, { failOn: 'none' })
        .rotate()
        .flatten({ background: '#ffffff' })
        .grayscale()
        .resize({ width: targetWidth, withoutEnlargement: currentWidth >= MIN_TARGET_WIDTH && currentWidth <= MAX_TARGET_WIDTH });

    const stats = await base().stats().catch(() => null);
    const meanLuminance = stats?.channels?.[0]?.mean ?? 200;
    const isDarkMode = meanLuminance < DARK_MEAN_LUMINANCE;
    const isLowContrast = stats?.channels?.[0]?.stdev != null && stats.channels[0].stdev < 45;

    const variants = [];

    // Variant 1: Enhanced Grayscale with Contrast Normalization & Mild Sharpening
    const enhancedPath = path.join(dir, 'enhanced.png');
    let enhancedPipe = base().normalize().sharpen({ sigma: 1, m1: 1.2, m2: 0.5 });
    if (isDarkMode) {
      enhancedPipe = enhancedPipe.negate();
    }
    await enhancedPipe.png().toFile(enhancedPath);
    variants.push({
      label: isDarkMode ? 'enhanced-dark-inverted' : 'enhanced',
      path: enhancedPath,
      isDarkMode,
    });

    // Variant 2: Thermal / Low-Contrast CLAHE (Contrast Limited Adaptive Histogram Equalization)
    // Thermal paper receipts often have uneven fading and yellowing. CLAHE boosts local character contrast.
    const thermalPath = path.join(dir, 'thermal.png');
    let thermalPipe = base();
    if (isDarkMode) thermalPipe = thermalPipe.negate();
    try {
      thermalPipe = thermalPipe.clahe({ width: 40, height: 40, maxSlope: 3 }).sharpen();
      await thermalPipe.png().toFile(thermalPath);
      variants.push({
        label: isLowContrast ? 'thermal-clahe-primary' : 'thermal-clahe',
        path: thermalPath,
      });
    } catch {
      // If clahe is unavailable in the libvips build, fallback to contrast gamma curve
      const gammaPath = path.join(dir, 'contrast-gamma.png');
      await base().gamma(1.2).normalize().sharpen().png().toFile(gammaPath);
      variants.push({ label: 'contrast-gamma', path: gammaPath });
    }

    // Variant 3: Preserved Grayscale for Crisp Digital Screenshots (GPay, PhonePe, Paytm)
    // Digital screenshots don't need heavy histogram alteration; unadulterated grayscale prevents ringing artifacts.
    const cleanPath = path.join(dir, 'clean-grayscale.png');
    let cleanPipe = base();
    if (isDarkMode) cleanPipe = cleanPipe.negate();
    await cleanPipe.png().toFile(cleanPath);
    variants.push({ label: 'clean-grayscale', path: cleanPath });

    // Inverted helper for documents that may have white-on-black header bars (e.g. TOTAL banners)
    let inverted = null;
    if (!isDarkMode) {
      const invertedPath = path.join(dir, 'inverted.png');
      await base().negate().png().toFile(invertedPath);
      inverted = { label: 'inverted', path: invertedPath };
    }

    const header = await writeHeaderBand(sharp, base(), dir);

    return {
      variants,
      header,
      inverted,
      isDarkMode,
      cleanup,
    };
  } catch {
    await cleanup();
    return { variants: [], cleanup: async () => {} };
  }
}
