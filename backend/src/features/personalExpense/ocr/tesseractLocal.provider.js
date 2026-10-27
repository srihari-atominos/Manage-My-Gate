import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_TIMEOUT_MS = 20_000;
const imageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const engineUnavailable = 'Local OCR engine is not installed or cannot be started.';

export const resolveTessdataDir = (env = process.env) => {
  if (env.TESSDATA_PREFIX && fs.existsSync(env.TESSDATA_PREFIX)) return env.TESSDATA_PREFIX;
  const projectTessdata = path.resolve(__dirname, '../../../../tessdata');
  if (fs.existsSync(projectTessdata)) return projectTessdata;
  return null;
};

const resolveTesseractCommand = (env = process.env) => {
  if (env.TESSERACT_COMMAND) return env.TESSERACT_COMMAND;
  if (process.platform === 'win32') {
    const winPath = 'C:\\Program Files\\Tesseract-OCR\\tesseract.exe';
    if (fs.existsSync(winPath)) return winPath;
  }
  return 'tesseract';
};

export function tesseractConfiguration(env = process.env) {
  const command = resolveTesseractCommand(env);
  const tessdataDir = resolveTessdataDir(env);
  const provider = env.PERSONAL_EXPENSE_OCR_PROVIDER || 'disabled';
  const rawLanguages = String(env.PERSONAL_EXPENSE_OCR_LANGUAGES || 'eng+tam')
    .split('+')
    .map((value) => value.trim())
    .filter(Boolean);
  const languages = rawLanguages.length ? rawLanguages : ['eng', 'tam'];
  const timeout = Number(env.PERSONAL_EXPENSE_OCR_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  return {
    provider,
    configured: provider === 'tesseract-local',
    command,
    tessdataDir,
    languages,
    timeoutMs: Number.isFinite(timeout) && timeout >= 1_000 && timeout <= 120_000 ? timeout : DEFAULT_TIMEOUT_MS,
  };
}

export function validateOcrFile(file) {
  if (!file) return { valid: false, status: 'INVALID_FILE', error: 'A receipt image is required.' };
  if (file.mimetype === 'application/pdf') {
    return {
      valid: false,
      status: 'UNSUPPORTED_FILE',
      error: 'PDF receipts can be stored securely, but local OCR currently supports JPG, PNG, and WEBP images only.',
    };
  }
  if (!imageMimeTypes.has(file.mimetype)) {
    return {
      valid: false,
      status: 'UNSUPPORTED_FILE',
      error: 'Local OCR supports JPG, PNG, and WEBP receipt images only.',
    };
  }
  return { valid: true };
}

function execute(command, args, timeoutMs, spawnImpl) {
  return new Promise((resolve) => {
    let output = '';
    let error = '';
    let settled = false;
    const finish = (result) => {
      if (!settled) {
        settled = true;
        resolve(result);
      }
    };
    let childProcess;
    try {
      childProcess = spawnImpl(command, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch {
      finish({ status: 'ENGINE_UNAVAILABLE', error: engineUnavailable });
      return;
    }
    const timer = setTimeout(() => {
      try {
        childProcess.kill('SIGKILL');
      } catch {}
      finish({ status: 'TIMEOUT', error: 'Receipt processing timed out. Enter the details manually.' });
    }, timeoutMs);

    childProcess.stdout?.setEncoding?.('utf8');
    childProcess.stderr?.setEncoding?.('utf8');
    childProcess.stdout?.on('data', (chunk) => {
      output += chunk;
    });
    childProcess.stderr?.on('data', (chunk) => {
      error += chunk;
    });
    childProcess.on('error', () => {
      clearTimeout(timer);
      finish({ status: 'ENGINE_UNAVAILABLE', error: engineUnavailable });
    });
    childProcess.on('close', (code) => {
      clearTimeout(timer);
      if (settled) return;
      if (code !== 0) {
        const languageProblem = /traineddata|language|failed loading/i.test(error);
        finish({
          status: languageProblem ? 'LANGUAGE_UNAVAILABLE' : 'ENGINE_ERROR',
          error: languageProblem
            ? 'The requested local OCR language data is not installed.'
            : 'Local OCR could not read this receipt. Enter the details manually.',
          rawError: error,
        });
        return;
      }
      finish({ status: 'COMPLETED', text: output });
    });
  });
}

/**
 * Checks Tesseract engine and verifies available trained language models.
 * If some requested languages are missing, returns which are available and which are missing.
 */
export async function checkTesseractRuntime(config = tesseractConfiguration(), spawnImpl = spawn) {
  const listArgs = config.tessdataDir ? ['--tessdata-dir', config.tessdataDir, '--list-langs'] : ['--list-langs'];
  const result = await execute(config.command, listArgs, config.timeoutMs, spawnImpl);
  if (result.status !== 'COMPLETED') return result;
  const installedLanguages = result.text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^list of available languages/i.test(line));

  const missingLanguages = config.languages.filter((language) => !installedLanguages.includes(language));
  const availableRequested = config.languages.filter((language) => installedLanguages.includes(language));

  if (missingLanguages.length > 0) {
    return {
      status: 'LANGUAGE_UNAVAILABLE',
      error: `The requested local OCR language data is not installed: ${missingLanguages.join(', ')}.`,
      missingLanguages,
      installedLanguages,
      usableLanguages: availableRequested.length ? availableRequested : (installedLanguages.includes('eng') ? ['eng'] : installedLanguages.slice(0, 1)),
    };
  }

  return { status: 'READY', installedLanguages, usableLanguages: config.languages };
}

/**
 * Rebuilds readable lines from Tesseract TSV output and averages word confidence (0-100).
 * TSV output format: level, page_num, block_num, par_num, line_num, word_num, left, top, width, height, conf, text
 */
export function parseTsv(tsv = '') {
  const lines = new Map();
  const wordDetails = [];
  const confidences = [];

  for (const row of String(tsv).split(/\r?\n/).slice(1)) {
    const cols = row.split('\t');
    if (cols.length < 12 || cols[0] !== '5') continue;
    const word = cols.slice(11).join('\t').trim();
    const confidence = Number(cols[10]);
    if (!word || !(confidence >= 0)) continue;

    const lineKey = `${cols[2]}-${cols[3]}-${cols[4]}`;
    if (!lines.has(lineKey)) lines.set(lineKey, []);
    lines.get(lineKey).push(word);
    confidences.push(confidence);

    wordDetails.push({
      word,
      confidence,
      bbox: {
        left: Number(cols[6]),
        top: Number(cols[7]),
        width: Number(cols[8]),
        height: Number(cols[9]),
      },
    });
  }

  return {
    text: [...lines.values()].map((words) => words.join(' ')).join('\n'),
    confidence: confidences.length
      ? Math.round((confidences.reduce((sum, value) => sum + value, 0) / confidences.length) * 10) / 10
      : null,
    wordDetails,
  };
}

export async function runTesseract(file, config = tesseractConfiguration(), spawnImpl = spawn) {
  // Callers that run several passes on one receipt can pass the first pass's `runtime` back to skip repeated `--list-langs` spawns.
  const runtime = config.runtime || (await checkTesseractRuntime(config, spawnImpl));
  let activeLanguages = config.languages;

  if (runtime.status !== 'READY') {
    if (runtime.status === 'LANGUAGE_UNAVAILABLE' && runtime.usableLanguages?.length) {
      // Graceful fallback to available language models while logging warning
      activeLanguages = runtime.usableLanguages;
    } else {
      return runtime;
    }
  }

  const psm = String(config.pageSegmentationMode || 3);
  const args = [file.path, 'stdout'];
  if (config.tessdataDir) {
    args.push('--tessdata-dir', config.tessdataDir);
  }
  args.push(
    '-l',
    activeLanguages.join('+'),
    '--psm',
    psm,
    '--oem',
    '1',
    '-c',
    'preserve_interword_spaces=1'
  );

  if (config.characterWhitelist) {
    args.push('-c', `tessedit_char_whitelist=${config.characterWhitelist}`);
  }

  if (config.withConfidence) {
    args.push('tsv');
  }

  const result = await execute(config.command, args, config.timeoutMs, spawnImpl);
  if (result.status !== 'COMPLETED') return result;

  // `tsv` is a Tesseract config file. Some lean deployments ship traineddata
  // files only (as this project does), so Tesseract writes normal text and
  // only warns on stderr when that config file is absent. Do not mistake that
  // successfully recognised text for an unreadable receipt.
  const isTsv = /^level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\b/m.test(result.text);
  const parsed = config.withConfidence && isTsv
    ? parseTsv(result.text)
    : { text: result.text, confidence: null, wordDetails: [] };
  if (!parsed.text.trim()) {
    return { status: 'NO_TEXT', error: 'No readable text was found on this receipt. Enter the details manually.' };
  }

  return {
    status: 'COMPLETED',
    text: parsed.text,
    confidence: parsed.confidence,
    wordDetails: parsed.wordDetails || [],
    usedLanguages: activeLanguages,
    runtime,
  };
}
