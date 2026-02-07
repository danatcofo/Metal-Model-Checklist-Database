# Metal-Model-Checklist-Database
A community driven database for metal models from various brands. This checklist is used with the "Metal Earth Checklist" application currently available on IOS.

Currently supported brands: Metal Earth, ICONX, Legends, Mega, Premium Series, MU, Piececool

## Source layout and build

- **Source of truth:** The `src/` folder. Each model is one JSON file under a type subfolder (e.g. `src/metal-earth/`, `src/iconx/`). File names are `{category}-{number}-{name}.json` (all lowercase, spaces as dashes).
- **Dist:** Run `npm run build` to compile all `src/**/*.json` into a single **dist/Model-Database.json** (array of all entries, sorted by type, number, name).
- **Adding a model:** Add a new JSON file in the correct type folder under `src/`, then run `npm run build`. Use the same field format as below.

## Instructions

New Entries MUST follow this format:

    {
        "number": "MODEL NUMBER",
        "name": "MODEL NAME",
        "difficulty": null, 
        "sheets": 1,
        "link": "https://www.metalearth.com/lockheed-martin/blue-angels-c-130-hercules",
        "checked": false,
        "type": "Premium Series",
        "status": "",
        "category": "Lockheed Martin®",
        "instructionsLink": "",
        "360View": "https://www.metalearth.com/360/PS2027",
        "description": "Model Description",
        "productimage": "https://www.metalearth.com/content/images/thumbs/0005778_blue-angels-c-130-hercules_570.png"
    },

**Number** - "Model Number"  
**Name** - "Model Name"  
**Difficulty** - Single number from 1 - 10, or null if unknown _(Note: No quote marks required)_  
**Sheets** - Number of Sheets _(Note: No quote marks required)_  
**Link** - "Link to Product Page"  
**Checked** - (LEAVE THIS AS "checked": false,)  
**Type** - Can be either: "Metal Earth" / "ICONX" / "Legends" / "Mega" / "Premium Series" / "MU" / "Piececool"  
**Status** - Can be either "" (Blank) / "Coming Soon" / "Exclusive" / "Retired"  
**Category** - "Model Category"  
**Instructions Link** - "Link to Instructions PDF File"  
**360View** - "Link to Model 360 View" _(Leave blank for MU and Piececool "")_  
**Description** - "Model Description"  
**Product Image** "Link to product image"  

Please note that the mode is wrapped in {} as seen above. If the model is not the final model in the list it should have a , following the }.

---

## Development setup (Node automation)

This repo uses **Node.js** for linting and git hooks. You need Node installed before running setup.

### 1. Install Node.js (if not already installed)

- **Windows (winget):** `winget install OpenJS.NodeJS.LTS`
- **Windows (Chocolatey):** `choco install nodejs-lts`
- **macOS (Homebrew):** `brew install node`
- **Linux (nvm):** install [nvm](https://github.com/nvm-sh/nvm), then `nvm install --lts`
- **Linux (apt):** `sudo apt update && sudo apt install nodejs npm`
- **Linux (dnf):** `sudo dnf install nodejs npm`
- **Manual:** [nodejs.org](https://nodejs.org/) — use the LTS version.

Close and reopen your terminal after installing.

### 2. Set up the repo

From the repo root, run the setup script for your OS:

**Windows**

- **Preferred (PowerShell):** `.\scripts\setup.ps1`
- **If scripts are disabled:** use the CMD script (no execution policy):  
  `scripts\setup.cmd`  
  Or run once with bypass:  
  `powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1`

**Linux / macOS:**
```bash
./scripts/setup.sh
```
Or: `sh scripts/setup.sh` (no execute bit needed).

This checks that Node is available, installs npm dependencies, and installs git hooks. Alternatively you can run `npm install` directly (same result once Node is installed).

### 3. What runs automatically

| When | What runs | If it fails |
|------|-----------|-------------|
| **Pre-commit** | **Lint** (then **build**) when `src/**/*.json` are staged; **lint** when `scripts/*.js` are staged | Commit is blocked |
| **Pre-push** | Full lint of all files under `src/` (path, filename, content) | Push to origin is blocked |

- **Lint** validates all `src/**/*.json` files: required fields, allowed `type`/`status` (from `lint-settings.json`), `difficulty` 1–10 or null, `sheets` as a number; folder = type (lowercase, dashes); filename = `{category}-{number}-{name}.json` (lowercase, spaces as dashes).
- **Build** compiles `src/` into `dist/Model-Database.json`.

### 4. Manual commands

- `npm run lint` — Lint all files under `src/` (path, filename, and content). Fails if any src file has wrong format, folder, or filename. Allowed types/status are configured in **lint-settings.json**.
- `npm run build` — Compile `src/**/*.json` → `dist/Model-Database.json` (used by pre-commit when relevant paths change).
- `npm run migrate` — One-time: split root `Model-Database.json` into `src/` (run once when migrating from the single-file layout).

