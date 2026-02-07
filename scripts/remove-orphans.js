/**
 * Remove src/**\/*.json files that do not correspond to any entry in dist/Model-Database.json.
 * Expected path per entry: src/{typeToFolder(type)}/{slug(category)}-{slug(number)}-{slug(name)}.json
 * Uses lint-helpers slug and typeToFolder so paths match what lint/fix expect.
 */

const fs = require('fs');
const path = require('path');
const { ROOT, SRC_DIR, slug, typeToFolder, walkDir } = require('./lib/lint-helpers');

const DIST_FILE = path.join(ROOT, 'dist', 'Model-Database.json');

function getExpectedPath(entry) {
  const folder = typeToFolder(entry.type);
  const basename = slug(entry.category) + '-' + slug(entry.number) + '-' + slug(entry.name) + '.json';
  return path.join(SRC_DIR, folder, basename);
}

function main() {
  if (!fs.existsSync(DIST_FILE)) {
    console.error('Dist file not found:', DIST_FILE);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(DIST_FILE, 'utf8'));
  if (!Array.isArray(data)) {
    console.error('Expected JSON array in dist');
    process.exit(1);
  }

  const expectedPaths = new Set();
  for (const entry of data) {
    if (entry.type && entry.category != null && entry.number != null && entry.name != null) {
      expectedPaths.add(path.normalize(getExpectedPath(entry)));
    }
  }

  const srcFiles = walkDir(SRC_DIR);
  let removed = 0;
  for (const filePath of srcFiles) {
    const normalized = path.normalize(filePath);
    if (!expectedPaths.has(normalized)) {
      fs.unlinkSync(filePath);
      console.log('Removed:', path.relative(ROOT, filePath));
      removed++;
    }
  }

  console.log(removed === 0 ? 'No orphan files to remove.' : `Removed ${removed} orphan file(s).`);
}

main();
