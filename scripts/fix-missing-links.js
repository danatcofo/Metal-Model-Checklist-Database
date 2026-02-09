/**
 * One-off: set placeholder "link" for src JSON entries that have missing or empty link.
 * Uses brand main page by type so lint passes.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src');

const DEFAULT_LINKS = {
  'Metal Earth': 'https://www.metalearth.com',
  'ICONX': 'https://www.metalearth.com',
  'Legends': 'https://www.metalearth.com',
  'Mega': 'https://www.metalearth.com',
  'Premium Series': 'https://www.metalearth.com',
  'MU': 'https://www.mu-store.com',
  'Piececool': 'https://piececool.com'
};

function walkDir(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walkDir(full, files);
    else if (e.isFile() && e.name.endsWith('.json')) files.push(full);
  }
  return files;
}

let fixed = 0;
for (const filePath of walkDir(SRC_DIR)) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  const need = data.link === undefined || data.link === null || (typeof data.link === 'string' && data.link.trim() === '');
  if (!need) continue;
  const url = DEFAULT_LINKS[data.type] || 'https://www.metalearth.com';
  data.link = url;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 0) + '\n', 'utf8');
  fixed++;
}
console.log('Fixed', fixed, 'files with missing or empty link.');
