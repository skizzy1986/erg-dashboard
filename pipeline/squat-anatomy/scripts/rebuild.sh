#!/usr/bin/env bash
# Assemble the page sources and rebuild dist/squat.html from the cached pipeline outputs.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
python3 "$ROOT/page/assemble.py"
python3 "$ROOT/pipeline/v3/build3.py" "$ROOT/page/template.html" "$ROOT/dist/squat.html" | tail -1
sha256sum "$ROOT/dist/squat.html"
