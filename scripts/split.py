"""
One-time migration: split Model-Database.json into src/{type}/{category}-{number}-{name}.json
Type folders and filenames are lowercased; spaces become dashes.
"""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "Model-Database.json"
SRC_DIR = ROOT / "src"


def type_to_folder(type_val):
    """Derive type folder name: lowercase, spaces -> dashes."""
    if type_val is None or type_val == "":
        return "unknown"
    s = str(type_val).lower().replace(" ", "-")
    s = re.sub(r'[\\/:*?"<>|]', "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s or "unknown"


def sanitize(s):
    """Sanitize for filename: lowercase, replace spaces and invalid chars with dash, strip ™ ®, collapse dashes."""
    if s is None or s == "":
        return "unknown"
    s = str(s).lower()
    s = re.sub(r'[\s\\/:*?"<>|]', "-", s)
    s = s.replace("\u2122", "").replace("\u00ae", "")  # ™ ®
    s = re.sub(r"[^\w-]", "-", s, flags=re.UNICODE)
    s = re.sub(r"-+", "-", s).strip("-")
    return s or "unknown"


def get_filename(entry):
    """Derive filename: {category}-{number}-{name}.json (all lowercase, no spaces)."""
    category = sanitize(entry.get("category"))
    number = entry.get("number")
    num = (number.lower().replace("/", "-").replace("\\", "-") if number else "unknown")
    name = sanitize(entry.get("name"))
    return f"{category}-{num}-{name}.json"


def main():
    if not SOURCE.exists():
        print("Source file not found:", SOURCE)
        raise SystemExit(1)

    data = json.loads(SOURCE.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        print("Expected JSON array")
        raise SystemExit(1)

    seen = {}
    skipped = 0

    for i, entry in enumerate(data):
        type_val = entry.get("type")
        category = entry.get("category")
        number = entry.get("number")
        name = entry.get("name")

        if not type_val or not category or not number or not name:
            print(f"[{i}] Skipping entry missing type/category/number/name: {number or name or '(no id)'}")
            skipped += 1
            continue

        type_folder = type_to_folder(type_val)
        dir_path = SRC_DIR / type_folder
        dir_path.mkdir(parents=True, exist_ok=True)

        filename = get_filename(entry)
        key = str(dir_path / filename)
        count = seen.get(key, 0)
        seen[key] = count + 1
        if count > 0:
            base, ext = filename.rsplit(".", 1)
            filename = f"{base}-{count + 1}.{ext}"

        out_path = dir_path / filename
        out_path.write_text(json.dumps(entry, indent=4, ensure_ascii=False), encoding="utf-8")

    print(f"Wrote {len(data) - skipped} entries to {SRC_DIR}")
    if skipped:
        print(f"Skipped {skipped} entries.")


if __name__ == "__main__":
    main()
