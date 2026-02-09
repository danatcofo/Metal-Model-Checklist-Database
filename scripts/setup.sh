.#!/usr/bin/env sh
# Setup script for Metal-Model-Checklist-Database (Linux / macOS)
# Ensures Node.js is available, then installs npm dependencies and git hooks.
# Run from repo root: ./scripts/setup.sh   or   sh scripts/setup.sh

set -e
cd "$(dirname "$0")/.."
REPO_ROOT="$(pwd)"

node_required() {
    echo ""
    echo "Node.js is required but was not found in PATH."
    echo ""
    echo "Install Node.js (LTS) using one of these methods:"
    echo "  - macOS (Homebrew):  brew install node"
    echo "  - Linux (nvm):       curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash   then: nvm install --lts"
    echo "  - Linux (apt):       sudo apt update && sudo apt install nodejs npm"
    echo "  - Linux (dnf):       sudo dnf install nodejs npm"
    echo "  - Manual:            https://nodejs.org/"
    echo ""
    echo "After installing, close and reopen your terminal, then run:"
    echo "  ./scripts/setup.sh"
    echo ""
    exit 1
}

if ! command -v node >/dev/null 2>&1; then
    node_required
fi

VERSION="$(node -v 2>/dev/null)" || node_required

echo "Node.js found: $VERSION"
echo "Installing dependencies (npm install)..."

npm install

echo ""
echo "Setup complete. Git hooks (pre-commit, pre-push) are installed."
echo "  - Pre-commit: lint/build runs when Model-Database.json or scripts change; commit fails if lint fails."
echo "  - Pre-push:  full lint runs before push to origin."
echo ""
