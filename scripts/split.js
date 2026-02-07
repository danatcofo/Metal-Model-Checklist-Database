/**
 * One-time migration: split Model-Database.json into src/{type}/{category}-{number}-{name}.json
 * Type folders and filenames are lowercased; spaces become dashes.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'Model-Database.json');
const SRC_DIR = path.join(ROOT, 'src');

/**
 * Derive type folder name: lowercase, spaces → dashes.
 */
function typeToFolder(type) {
  if (type == null || type === '') return 'unknown';
  return String(type)
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'unknown';
}

/**
 * Sanitize for filename: lowercase, replace spaces and invalid chars with dash,
 * strip Unicode symbols (™, ®), collapse dashes, trim.
 */
function sanitize(str) {
  if (str == null || str === '') return 'unknown';
  let s = String(str)
    .toLowerCase()
    .replace(/[\s\\/:*?"<>|]/g, '-')
    .replace(/[\u2122\u00AE]/g, '') // ™ ®
    .replace(/[^\p{L}\p{N}-]/gu, '-') // other non-letters/numbers/dash → dash
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return s || 'unknown';
}

/**
 * Derive filename: {category}-{number}-{name}.json (all lowercase, no spaces).
 */
function getFilename(entry) {
  const type = entry.type;
  const category = entry.category;
  const number = entry.number;
  const name = entry.name;

  const typeFolder = typeToFolder(type);
  const cat = sanitize(category);
  const num = number != null ? sanitize(String(number)) : 'unknown';
  const n = sanitize(name);

  return `${cat}-${num}-${n}.json`;
}

function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error('Source file not found:', SOURCE);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
  if (!Array.isArray(data)) {
    console.error('Expected JSON array');
    process.exit(1);
  }

  const seen = new Map(); // key = dir + base filename → count for collision suffix

  let skipped = 0;
  for (let i = 0; i < data.length; i++) {
    const entry = data[i];
    const type = entry.type;
    const typeFolder = typeToFolder(type);
    if (!type || !entry.category || entry.category === '' || !entry.number || entry.number === '' || !entry.name || entry.name === '') {
      console.warn(`[${i}] Skipping entry missing type/category/number/name:`, entry.number || entry.name || '(no id)');
      skipped++;
      continue;
    }

    const dir = path.join(SRC_DIR, typeFolder);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let filename = getFilename(entry);
    const key = path.join(dir, filename);
    let count = seen.get(key) || 0;
    seen.set(key, count + 1);
    if (count > 0) {
      const ext = path.extname(filename);
      const base = path.basename(filename, ext);
      filename = `${base}-${count + 1}${ext}`;
    }

    const outPath = path.join(dir, filename);
    fs.writeFileSync(outPath, JSON.stringify(entry, null, 4), 'utf8');
  }

  console.log(`Wrote ${data.length - skipped} entries to ${SRC_DIR}`);
  if (skipped > 0) console.log(`Skipped ${skipped} entries.`);
}

main();
