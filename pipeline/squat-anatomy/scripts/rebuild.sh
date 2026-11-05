#!/usr/bin/env bash
# Rebuild dist/squat.html from the page sources and the cached pipeline outputs, then check it.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
python3 -m squat build --out "$ROOT/dist/squat.html"
python3 -m squat verify "$ROOT/dist/squat.html"
sha256sum "$ROOT/dist/squat.html"
