/**
 * Shared helpers for lint-src.js and fix-src.js: slug, typeToFolder, settings, walkDir.
 * ROOT is the repo root (parent of scripts/).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SRC_DIR = path.join(ROOT, 'src');

const DEFAULT_LINKS = {
  'Metal Earth': 'https://www.metalearth.com',
  'ICONX': 'https://www.metalearth.com',
  'Legends': 'https://www.metalearth.com',
  'Mega': 'https://www.metalearth.com',
  'Premium Series': 'https://www.metalearth.com',
  'MU': 'https://www.mu-store.com',
  'Piececool': 'https://piececool.com',
  'Tenyo': 'https://tenyo.jp',
  'Microworld': '',
  'Ironstar': '',
  'Picture Kingdom': '', 
  'HK Nanyuan': '',
  'Metal Tour': '',
  'DaTang': '',
  'Strato Studio': ''
};

const FALLBACK_DEFAULTS = {
  checked: false,
  difficulty: null,
  sheets: null,
  status: '',
  instructionsLink: '',
  '360View': '',
  description: '',
  productimage: ''
};

const FALLBACK_SETTINGS = {
  allowedTypes: [
    'Metal Earth', 'ICONX', 'Legends', 'Mega', 'Premium Series', 'MU', 'Piececool', 'Tenyo', 'Microworld', 'Ironstar', 'Picture Kingdom', 'HK Nanyuan', 'Metal Tour', 'DaTang', 'Strato Studio'
  ],
  allowedStatus: ['', 'Coming Soon', 'Exclusive', 'Retired']
};

/** Slug: punctuation -> space (removed from filename), lowercase, spaces -> single dash, keep only letters (Unicode), digits, hyphen. */
function slug(s) {
  if (s == null || typeof s !== 'string') return '';
  const noPunct = s.replace(/\p{P}/gu, ' ');
  const step = noPunct.toLowerCase().trim().replace(/\s+/g, '-');
  return step.replace(/[^\p{L}\p{N}-]/gu, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

/** Type string -> folder name: lowercase, spaces to dashes, strip non-alnum except hyphen. */
function typeToFolder(type) {
  return slug(type);
}

function loadSettings() {
  const configPath = path.join(ROOT, 'lint-settings.json');
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const settings = JSON.parse(raw);
    return {
      allowedTypes: Array.isArray(settings.allowedTypes) ? settings.allowedTypes : FALLBACK_SETTINGS.allowedTypes,
      allowedStatus: Array.isArray(settings.allowedStatus) ? settings.allowedStatus : FALLBACK_SETTINGS.allowedStatus,
      defaults: settings.defaults != null && typeof settings.defaults === 'object' ? { ...FALLBACK_DEFAULTS, ...settings.defaults } : FALLBACK_DEFAULTS,
      defaultLinks: settings.defaultLinks != null && typeof settings.defaultLinks === 'object' ? { ...DEFAULT_LINKS, ...settings.defaultLinks } : DEFAULT_LINKS
    };
  } catch (e) {
    return { ...FALLBACK_SETTINGS, defaults: FALLBACK_DEFAULTS, defaultLinks: DEFAULT_LINKS };
  }
}

function getAllowedFolders(settings) {
  return new Set(settings.allowedTypes.map(typeToFolder));
}

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

/** Canonical key order for normalized JSON output. */
const CANONICAL_KEYS = [
  'checked', 'name', 'number', 'difficulty', 'sheets', 'link', 'category', 'type', 'status',
  'instructionsLink', '360View', 'description', 'productimage'
];

module.exports = {
  ROOT,
  SRC_DIR,
  slug,
  typeToFolder,
  loadSettings,
  getAllowedFolders,
  walkDir,
  CANONICAL_KEYS
};
