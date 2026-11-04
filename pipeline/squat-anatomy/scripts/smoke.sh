#!/usr/bin/env bash
# Render the three standard layouts and report page errors. Screenshots land in out/.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT/harness"; mkdir -p "$ROOT/out"
[ -d node_modules/three ] || npm install --silent
node shot.js ../dist/squat.html ../out/desk '[{"name":"bottom","set":{"depth":1,"view":"side","form":true},"steps":6},{"name":"drive","set":{"time":2.5,"view":"three","tab":"force"},"steps":6}]' 1440 900
DARK=1 node shot2.js ../dist/squat.html ../out/dark '[{"name":"moments","set":{"time":2.6,"view":"three","tab":"moments"},"steps":6}]' 1280 820
node shot.js ../dist/squat.html ../out/phone '[{"name":"lowering","set":{"time":1.9,"view":"side"},"steps":6}]' 390 844
node evalpage.js ../dist/squat.html "(() => { __squat.set({time:2.55}); __step(3); return {phase: document.getElementById('phase').textContent, score: document.getElementById('score').textContent}; })()"
echo "screenshots in out/"
