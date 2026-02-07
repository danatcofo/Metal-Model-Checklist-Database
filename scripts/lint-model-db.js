/**
 * Linter for Model-Database.json. Validates structure and field rules per README.
 * Usage: node scripts/lint-model-db.js [path]
 *   path: optional; defaults to Model-Database.json in repo root.
 *   When run via lint-staged, staged file paths may be passed.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_DB = path.join(ROOT, 'Model-Database.json');

const REQUIRED_TYPES = [
  'Metal Earth', 'ICONX', 'Legends', 'Mega', 'Premium Series', 'MU', 'Piececool'
];
const ALLOWED_STATUS = ['', 'Coming Soon', 'Exclusive', 'Retired'];

function resolveInput(args) {
  const fileArg = args.find(a => a.endsWith('.json') && !a.startsWith('-'));
  if (fileArg) {
    const absolute = path.isAbsolute(fileArg) ? fileArg : path.join(ROOT, fileArg);
    if (fs.existsSync(absolute)) return absolute;
  }
  if (fs.existsSync(DEFAULT_DB)) return DEFAULT_DB;
  return null;
}

function lint(dbPath) {
  let raw;
  try {
    raw = fs.readFileSync(dbPath, 'utf8');
  } catch (e) {
    console.error('Error reading file:', dbPath, e.message);
    return false;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error('Invalid JSON:', e.message);
    return false;
  }

  if (!Array.isArray(data)) {
    console.error('Model-Database.json must be a JSON array.');
    return false;
  }

  let failed = false;
  for (let i = 0; i < data.length; i++) {
    const entry = data[i];
    const prefix = `[${i}]`;
    if (entry == null || typeof entry !== 'object') {
      console.error(`${prefix} Entry must be an object.`);
      failed = true;
      continue;
    }

    // Required string fields
    const required = ['number', 'name', 'category', 'link', 'type'];
    for (const key of required) {
      const v = entry[key];
      if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) {
        console.error(`${prefix} Missing or empty required field: "${key}".`);
        failed = true;
      }
    }

    // checked must be boolean false for new entries
    if (entry.checked !== undefined && typeof entry.checked !== 'boolean') {
      console.error(`${prefix} "checked" must be a boolean.`);
      failed = true;
    }

    // type must be one of allowed
    if (entry.type != null && !REQUIRED_TYPES.includes(entry.type)) {
      console.error(`${prefix} "type" must be one of: ${REQUIRED_TYPES.join(', ')}. Got: ${JSON.stringify(entry.type)}`);
      failed = true;
    }

    // status
    if (entry.status !== undefined && entry.status !== null && !ALLOWED_STATUS.includes(entry.status)) {
      console.error(`${prefix} "status" must be one of: ${ALLOWED_STATUS.map(s => s === '' ? '""' : s).join(', ')}. Got: ${JSON.stringify(entry.status)}`);
      failed = true;
    }

    // difficulty: number 1-10 or null
    if (entry.difficulty !== undefined && entry.difficulty !== null) {
      const n = Number(entry.difficulty);
      if (Number.isNaN(n) || n < 1 || n > 10) {
        console.error(`${prefix} "difficulty" must be 1-10 or null. Got: ${JSON.stringify(entry.difficulty)}`);
        failed = true;
      }
    }

    // sheets: number
    if (entry.sheets !== undefined && entry.sheets !== null) {
      const n = Number(entry.sheets);
      if (Number.isNaN(n) || n < 0) {
        console.error(`${prefix} "sheets" must be a non-negative number. Got: ${JSON.stringify(entry.sheets)}`);
        failed = true;
      }
    }
  }

  return !failed;
}

function main() {
  const dbPath = resolveInput(process.argv.slice(2));
  if (!dbPath) {
    console.error('Model-Database.json not found. Run from repo root or pass path.');
    process.exit(1);
  }
  const ok = lint(dbPath);
  process.exit(ok ? 0 : 1);
}

main();
