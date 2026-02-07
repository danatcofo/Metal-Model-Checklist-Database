/**
 * Linter for JSON files under src/. Validates single-object content, folder = type slug, filename = category-number-name slug.
 * Usage: node scripts/lint-src.js [path ...]
 *   paths: optional; when provided (e.g. from lint-staged), lint only those files under src/.
 *   When no paths given, discover and lint all JSON files under src/.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src');

const FALLBACK_SETTINGS = {
  allowedTypes: [
    'Metal Earth', 'ICONX', 'Legends', 'Mega', 'Premium Series', 'MU', 'Piececool'
  ],
  allowedStatus: ['', 'Coming Soon', 'Exclusive', 'Retired']
};

function loadSettings() {
  const configPath = path.join(ROOT, 'lint-settings.json');
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const settings = JSON.parse(raw);
    return {
      allowedTypes: Array.isArray(settings.allowedTypes) ? settings.allowedTypes : FALLBACK_SETTINGS.allowedTypes,
      allowedStatus: Array.isArray(settings.allowedStatus) ? settings.allowedStatus : FALLBACK_SETTINGS.allowedStatus
    };
  } catch (e) {
    return FALLBACK_SETTINGS;
  }
}

const SETTINGS = loadSettings();

/** Type string -> folder name: lowercase, spaces to dashes, strip non-alnum except hyphen. */
function typeToFolder(type) {
  return slug(type);
}

/** Slug: punctuation -> space (removed from filename), lowercase, spaces -> single dash, keep only letters (Unicode), digits, hyphen. */
function slug(s) {
  if (s == null || typeof s !== 'string') return '';
  const noPunct = s.replace(/\p{P}/gu, ' ');
  const step = noPunct.toLowerCase().trim().replace(/\s+/g, '-');
  return step.replace(/[^\p{L}\p{N}-]/gu, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

const ALLOWED_FOLDERS = new Set(SETTINGS.allowedTypes.map(typeToFolder));

function walkDir(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      walkDir(full, files);
    } else if (e.isFile() && e.name.endsWith('.json')) {
      files.push(full);
    }
  }
  return files;
}

function resolveInputPaths(args) {
  const jsonPaths = args.filter(a => typeof a === 'string' && a.endsWith('.json') && !a.startsWith('-'));
  if (jsonPaths.length > 0) {
    return jsonPaths.map(p => path.isAbsolute(p) ? p : path.join(ROOT, p)).filter(p => {
      const norm = path.normalize(p);
      const rel = path.relative(SRC_DIR, path.dirname(norm));
      return !rel.startsWith('..') && rel !== '..';
    });
  }
  return walkDir(SRC_DIR);
}

function lintEntry(entry, prefix, settings) {
  const errors = [];
  if (entry == null || typeof entry !== 'object') {
    errors.push(`${prefix} Entry must be an object.`);
    return errors;
  }

  const required = ['number', 'name', 'category', 'link', 'type'];
  for (const key of required) {
    const v = entry[key];
    if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) {
      errors.push(`${prefix} Missing or empty required field: "${key}".`);
    }
  }

  if (entry.checked !== undefined && typeof entry.checked !== 'boolean') {
    errors.push(`${prefix} "checked" must be a boolean.`);
  }

  if (entry.type != null && !settings.allowedTypes.includes(entry.type)) {
    errors.push(`${prefix} "type" must be one of: ${settings.allowedTypes.join(', ')}. Got: ${JSON.stringify(entry.type)}`);
  }

  if (entry.status !== undefined && entry.status !== null && !settings.allowedStatus.includes(entry.status)) {
    errors.push(`${prefix} "status" must be one of: ${settings.allowedStatus.map(s => s === '' ? '""' : s).join(', ')}. Got: ${JSON.stringify(entry.status)}`);
  }

  if (entry.difficulty !== undefined && entry.difficulty !== null) {
    const n = Number(entry.difficulty);
    if (Number.isNaN(n) || n < 1 || n > 10) {
      errors.push(`${prefix} "difficulty" must be 1-10 or null. Got: ${JSON.stringify(entry.difficulty)}`);
    }
  }

  if (entry.sheets !== undefined && entry.sheets !== null) {
    const n = Number(entry.sheets);
    if (Number.isNaN(n) || n < 0) {
      errors.push(`${prefix} "sheets" must be a non-negative number. Got: ${JSON.stringify(entry.sheets)}`);
    }
  }

  return errors;
}

function lintOneFile(filePath) {
  const errors = [];
  const relativePath = path.relative(ROOT, filePath);
  const parts = path.relative(SRC_DIR, filePath).split(path.sep);
  const folder = parts.length >= 2 ? parts[0] : '';
  const basename = path.basename(filePath);

  if (parts.length < 2) {
    errors.push(`${relativePath}: File must be under src/{type}/ (e.g. src/metal-earth/...).`);
    return errors;
  }

  if (!ALLOWED_FOLDERS.has(folder)) {
    errors.push(`${relativePath}: Folder must be one of: ${[...ALLOWED_FOLDERS].sort().join(', ')}. Got: "${folder}".`);
  }

  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    errors.push(`${relativePath}: Error reading file: ${e.message}`);
    return errors;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    errors.push(`${relativePath}: Invalid JSON: ${e.message}`);
    return errors;
  }

  if (data == null || typeof data !== 'object' || Array.isArray(data)) {
    errors.push(`${relativePath}: File must contain a single JSON object (one model entry), not an array or null.`);
    return errors;
  }

  const entry = data;
  const prefix = relativePath;

  errors.push(...lintEntry(entry, prefix, SETTINGS));

  const expectedFolder = typeToFolder(entry.type);
  if (expectedFolder && folder !== expectedFolder) {
    errors.push(`${relativePath}: Folder must match type. Type is "${entry.type}" so folder must be "${expectedFolder}".`);
  }

  const expectedBasename = slug(entry.category) + '-' + slug(entry.number) + '-' + slug(entry.name) + '.json';
  if (basename !== expectedBasename) {
    errors.push(`${relativePath}: Filename must be {category}-{number}-{name}.json (lowercase, spaces as dashes). Expected: ${expectedBasename}. Got: ${basename}.`);
  }

  return errors;
}

function main() {
  const args = process.argv.slice(2);
  const filePaths = resolveInputPaths(args);

  const allErrors = [];
  for (const filePath of filePaths) {
    allErrors.push(...lintOneFile(filePath));
  }

  if (allErrors.length > 0) {
    allErrors.forEach(e => console.error(e));
    process.exit(1);
  }
  process.exit(0);
}

main();
