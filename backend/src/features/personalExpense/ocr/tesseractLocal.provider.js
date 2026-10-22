import { spawn } from 'node:child_process';

const DEFAULT_TIMEOUT_MS = 20_000;
const imageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const engineUnavailable = 'Local OCR engine is not installed or cannot be started.';

export function tesseractConfiguration(env = process.env) {
  const provider = env.PERSONAL_EXPENSE_OCR_PROVIDER || 'disabled';
  const languages = String(env.PERSONAL_EXPENSE_OCR_LANGUAGES || 'eng').split('+').map((value) => value.trim()).filter(Boolean);
  const timeout = Number(env.PERSONAL_EXPENSE_OCR_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  return {
    provider,
    configured: provider === 'tesseract-local',
    command: env.TESSERACT_COMMAND || 'tesseract',
    languages,
    timeoutMs: Number.isFinite(timeout) && timeout >= 1_000 && timeout <= 120_000 ? timeout : DEFAULT_TIMEOUT_MS,
  };
}

export function validateOcrFile(file) {
  if (!file) return { valid: false, status: 'INVALID_FILE', error: 'A receipt image is required.' };
  if (file.mimetype === 'application/pdf') return { valid: false, status: 'UNSUPPORTED_FILE', error: 'PDF receipts can be stored, but local OCR currently supports JPG, PNG, and WEBP images only.' };
  if (!imageMimeTypes.has(file.mimetype)) return { valid: false, status: 'UNSUPPORTED_FILE', error: 'Local OCR supports JPG, PNG, and WEBP receipt images only.' };
  return { valid: true };
}

function execute(command, args, timeoutMs, spawnImpl) {
  return new Promise((resolve) => {
    let output = '';
    let error = '';
    let settled = false;
    const finish = (result) => { if (!settled) { settled = true; resolve(result); } };
    let process;
    try {
      process = spawnImpl(command, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch {
      finish({ status: 'ENGINE_UNAVAILABLE', error: engineUnavailable });
      return;
    }
    const timer = setTimeout(() => {
      try { process.kill('SIGKILL'); } catch {}
      finish({ status: 'TIMEOUT', error: 'Receipt processing timed out. Enter the details manually.' });
    }, timeoutMs);
    process.stdout?.setEncoding?.('utf8');
    process.stderr?.setEncoding?.('utf8');
    process.stdout?.on('data', (chunk) => { output += chunk; });
    process.stderr?.on('data', (chunk) => { error += chunk; });
    process.on('error', () => { clearTimeout(timer); finish({ status: 'ENGINE_UNAVAILABLE', error: engineUnavailable }); });
    process.on('close', (code) => {
      clearTimeout(timer);
      if (settled) return;
      if (code !== 0) {
        const languageProblem = /traineddata|language|failed loading/i.test(error);
        finish({ status: languageProblem ? 'LANGUAGE_UNAVAILABLE' : 'ENGINE_ERROR', error: languageProblem ? 'The requested local OCR language data is not installed.' : 'Local OCR could not read this receipt. Enter the details manually.' });
        return;
      }
      finish({ status: 'COMPLETED', text: output });
    });
  });
}

export async function checkTesseractRuntime(config = tesseractConfiguration(), spawnImpl = spawn) {
  const result = await execute(config.command, ['--list-langs'], config.timeoutMs, spawnImpl);
  if (result.status !== 'COMPLETED') return result;
  const installedLanguages = result.text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !/^list of available languages/i.test(line));
  const missingLanguages = config.languages.filter((language) => !installedLanguages.includes(language));
  if (missingLanguages.length) {
    return { status: 'LANGUAGE_UNAVAILABLE', error: `The requested local OCR language data is not installed: ${missingLanguages.join(', ')}.`, installedLanguages };
  }
  return { status: 'READY', installedLanguages };
}

// Rebuilds readable lines from Tesseract TSV output and averages word confidence (0-100).
export function parseTsv(tsv = '') {
  const lines = new Map();
  const confidences = [];
  for (const row of String(tsv).split(/\r?\n/).slice(1)) {
    const cols = row.split('\t');
    if (cols.length < 12 || cols[0] !== '5') continue;
    const word = cols.slice(11).join('\t').trim();
    const confidence = Number(cols[10]);
    if (!word || !(confidence >= 0)) continue;
    const key = `${cols[2]}-${cols[3]}-${cols[4]}`;
    if (!lines.has(key)) lines.set(key, []);
    lines.get(key).push(word);
    confidences.push(confidence);
  }
  return {
    text: [...lines.values()].map((words) => words.join(' ')).join('\n'),
    confidence: confidences.length ? Math.round((confidences.reduce((sum, value) => sum + value, 0) / confidences.length) * 10) / 10 : null,
  };
}

export async function runTesseract(file, config = tesseractConfiguration(), spawnImpl = spawn) {
  const runtime = await checkTesseractRuntime(config, spawnImpl);
  if (runtime.status !== 'READY') return runtime;
  const psm = String(config.pageSegmentationMode || 4);
  const args = [
    file.path,
    'stdout',
    '-l',
    config.languages.join('+'),
    '--psm',
    psm,
    '-c',
    'preserve_interword_spaces=1',
  ];
  if (config.withConfidence) {
    args.push('--oem', '1', 'tsv');
  }
  const result = await execute(config.command, args, config.timeoutMs, spawnImpl);
  if (result.status !== 'COMPLETED') return result;
  const parsed = config.withConfidence ? parseTsv(result.text) : { text: result.text, confidence: null };
  if (!parsed.text.trim()) return { status: 'NO_TEXT', error: 'No readable text was found on this receipt. Enter the details manually.' };
  return { status: 'COMPLETED', text: parsed.text, confidence: parsed.confidence };
}
