/**
 * Compile src/ (all .json files) into dist/Model-Database.json.
 * Reads all JSON files under src/, sorts by type then number then name, writes single array.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src');
const DIST_FILE = path.join(ROOT, 'dist', 'Model-Database.json');

function walkDir(dir, files = []) {
  if (!fs.existsSync(dir)) {
    console.error('Source directory not found:', dir);
    process.exit(1);
  }
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

function main() {
  const jsonFiles = walkDir(SRC_DIR);
  const entries = [];
  for (const f of jsonFiles) {
    const content = fs.readFileSync(f, 'utf8');
    try {
      const obj = JSON.parse(content);
      entries.push(obj);
    } catch (err) {
      console.error('Invalid JSON:', f, err.message);
      process.exit(1);
    }
  }

  entries.sort((a, b) => {
    const t = (a.type || '').localeCompare(b.type || '');
    if (t !== 0) return t;
    const n = (a.number || '').localeCompare(b.number || '');
    if (n !== 0) return n;
    return (a.name || '').localeCompare(b.name || '');
  });

  const distDir = path.dirname(DIST_FILE);
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }
  fs.writeFileSync(DIST_FILE, JSON.stringify(entries, null, 4), 'utf8');
  console.log(`Wrote ${entries.length} entries to ${DIST_FILE}`);
}

main();
