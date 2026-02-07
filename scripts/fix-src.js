/**
 * Auto-fix path and schema lint issues for src/**\/*.json.
 * Usage: node scripts/fix-src.js [--dry-run] [--paths-only] [--schema-only] [path ...]
 *   --dry-run     Only report path renames; do not move files (paths-only when combined with default).
 *   --paths-only  Only fix folder/filename; do not fix schema.
 *   --schema-only Only fix missing schema fields; do not move/rename files.
 *   path ...      Optional; when provided, fix only those files under src/. Otherwise fix all.
 * Default: fix paths then schema.
 */

const fs = require('fs');
const path = require('path');
const {
  ROOT,
  SRC_DIR,
  slug,
  typeToFolder,
  loadSettings,
  walkDir,
  CANONICAL_KEYS
} = require('./lib/lint-helpers');

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

function parseArgs(argv) {
  const args = argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const pathsOnly = args.includes('--paths-only');
  const schemaOnly = args.includes('--schema-only');
  const fileArgs = args.filter(a => typeof a === 'string' && !a.startsWith('-'));
  return { dryRun, pathsOnly, schemaOnly, fileArgs };
}

// --- Path fix ---

function getExpectedPath(filePath, entry) {
  const expectedFolder = typeToFolder(entry.type);
  const expectedBasename = slug(entry.category) + '-' + slug(entry.number) + '-' + slug(entry.name) + '.json';
  return path.join(SRC_DIR, expectedFolder, expectedBasename);
}

function fixPaths(filePaths, dryRun) {
  const renames = []; // { from, to }
  const collisions = []; // message strings
  const targetToFrom = new Map(); // target path -> source path (for collision detection)

  for (const filePath of filePaths) {
    let raw;
    try {
      raw = fs.readFileSync(filePath, 'utf8');
    } catch (e) {
      console.error('Error reading:', filePath, e.message);
      continue;
    }
    let entry;
    try {
      entry = JSON.parse(raw);
    } catch (e) {
      console.error('Invalid JSON:', filePath, e.message);
      continue;
    }
    if (entry == null || typeof entry !== 'object' || Array.isArray(entry)) {
      console.error('Skipping non-object file:', filePath);
      continue;
    }

    const expectedPath = getExpectedPath(filePath, entry);
    const currentPath = path.normalize(filePath);
    const expectedPathNorm = path.normalize(expectedPath);

    if (currentPath === expectedPathNorm) continue;

    if (targetToFrom.has(expectedPathNorm) && targetToFrom.get(expectedPathNorm) !== currentPath) {
      collisions.push(`Collision: ${path.relative(ROOT, filePath)} and ${path.relative(ROOT, targetToFrom.get(expectedPathNorm))} both want -> ${path.relative(ROOT, expectedPath)}`);
      continue;
    }
    targetToFrom.set(expectedPathNorm, currentPath);

    if (fs.existsSync(expectedPathNorm)) {
      try {
        const currentReal = fs.realpathSync(currentPath);
        const targetReal = fs.realpathSync(expectedPathNorm);
        if (currentReal !== targetReal) {
          collisions.push(`Target exists: ${path.relative(ROOT, expectedPath)} (different file)`);
          continue;
        }
        continue;
      } catch (_) {
        collisions.push(`Target exists: ${path.relative(ROOT, expectedPath)}`);
        continue;
      }
    }

    renames.push({ from: currentPath, to: expectedPathNorm });
  }

  // Dedupe: multiple sources mapping to same target (should not happen after collision check, but ensure unique targets)
  const uniqueRenames = [];
  const seenTarget = new Set();
  for (const r of renames) {
    const toNorm = path.normalize(r.to);
    if (seenTarget.has(toNorm)) continue;
    seenTarget.add(toNorm);
    uniqueRenames.push(r);
  }

  if (collisions.length > 0) {
    collisions.forEach(m => console.error(m));
  }

  if (uniqueRenames.length === 0) {
    if (renames.length === 0 && collisions.length === 0) {
      console.log('No path fixes needed.');
    }
    return [];
  }

  if (dryRun) {
    uniqueRenames.forEach(r => console.log(path.relative(ROOT, r.from), '->', path.relative(ROOT, r.to)));
    console.log('Dry run: no files moved.');
    return [];
  }

  const tempDir = path.join(SRC_DIR, '.fix-src-temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  try {
    const tempPaths = [];
    for (let i = 0; i < uniqueRenames.length; i++) {
      const r = uniqueRenames[i];
      const tempPath = path.join(tempDir, `${i}-${path.basename(r.from)}`);
      fs.renameSync(r.from, tempPath);
      tempPaths.push(tempPath);
    }
    for (let i = 0; i < uniqueRenames.length; i++) {
      const r = uniqueRenames[i];
      const dir = path.dirname(r.to);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.renameSync(tempPaths[i], r.to);
      console.log('Moved:', path.relative(ROOT, r.from), '->', path.relative(ROOT, r.to));
    }
  } finally {
    if (fs.existsSync(tempDir)) {
      try {
        fs.rmdirSync(tempDir);
      } catch (_) {}
    }
  }

  return uniqueRenames.map(r => r.to);
}

// --- Schema fix ---

function normalizeEntry(entry, settings) {
  const defaults = settings.defaults || {};
  const defaultLinks = settings.defaultLinks || {};
  const out = {};

  for (const key of CANONICAL_KEYS) {
    let value = entry[key];
    if (value === undefined || value === null) {
      if (key === 'link') {
        value = defaultLinks[entry.type] || 'https://www.metalearth.com';
      } else {
        value = defaults[key];
      }
    } else if (key === 'link' && typeof value === 'string' && value.trim() === '') {
      value = defaultLinks[entry.type] || 'https://www.metalearth.com';
    }
    out[key] = value;
  }

  // Preserve any extra keys not in CANONICAL_KEYS at the end
  for (const key of Object.keys(entry)) {
    if (!(key in out)) out[key] = entry[key];
  }
  return out;
}

function fixSchema(filePaths, settings) {
  let fixed = 0;
  for (const filePath of filePaths) {
    let raw;
    try {
      raw = fs.readFileSync(filePath, 'utf8');
    } catch (e) {
      console.error('Error reading:', filePath, e.message);
      continue;
    }
    let entry;
    try {
      entry = JSON.parse(raw);
    } catch (e) {
      console.error('Invalid JSON:', filePath, e.message);
      continue;
    }
    if (entry == null || typeof entry !== 'object' || Array.isArray(entry)) {
      console.error('Skipping non-object file:', filePath);
      continue;
    }

    const normalized = normalizeEntry(entry, settings);
    const needsWrite = CANONICAL_KEYS.some(k => entry[k] !== normalized[k]) ||
      JSON.stringify(entry) !== JSON.stringify(normalized);
    if (!needsWrite) continue;

    const ordered = {};
    for (const k of CANONICAL_KEYS) {
      ordered[k] = normalized[k];
    }
    for (const k of Object.keys(normalized)) {
      if (!(k in ordered)) ordered[k] = normalized[k];
    }
    fs.writeFileSync(filePath, JSON.stringify(ordered, null, 4), 'utf8');
    fixed++;
  }
  return fixed;
}

// --- Main ---

function main() {
  const { dryRun, pathsOnly, schemaOnly, fileArgs } = parseArgs(process.argv);
  const filePaths = resolveInputPaths(fileArgs);

  if (filePaths.length === 0) {
    console.log('No JSON files under src/ to fix.');
    process.exit(0);
  }

  let pathsFixed = [];
  const doPaths = !schemaOnly;
  const doSchema = !pathsOnly && !dryRun;

  if (doPaths) {
    pathsFixed = fixPaths(filePaths, dryRun);
  }

  if (doSchema) {
    const settings = loadSettings();
    const schemaPaths = pathsFixed.length > 0 ? walkDir(SRC_DIR) : filePaths;
    const schemaCount = fixSchema(schemaPaths, settings);
    if (schemaCount > 0) {
      console.log('Schema: fixed', schemaCount, 'file(s).');
    } else if (!doPaths || pathsFixed.length === 0) {
      console.log('No schema fixes needed.');
    }
  }

  process.exit(0);
}

main();
