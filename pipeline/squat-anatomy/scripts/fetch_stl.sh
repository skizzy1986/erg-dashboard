#!/usr/bin/env bash
# Fetch BodyParts3D STLs by FMA id into pipeline/ext/stl without downloading the whole repository.
# Usage: scripts/fetch_stl.sh FMA34680 FMA32547 ...   (no args = the 14 files the v3 pipeline reads)
# Never run `git ls-tree -l` in the blobless clone: it downloads every blob.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; DEST="$ROOT/pipeline/ext/stl"; CLONE="$ROOT/pipeline/ext/bp3d"
mkdir -p "$DEST"
IDS=("$@"); [ ${#IDS[@]} -eq 0 ] && IDS=(FMA23130 FMA23464 FMA23467 FMA24468 FMA24446 FMA24437 FMA13322 FMA13395 FMA34680 FMA34682 FMA34684 FMA34690 FMA79979 FMA45874)
if [ ! -d "$CLONE/.git" ]; then
  git clone --filter=blob:none --no-checkout --depth 1 https://github.com/Kevin-Mattheus-Moerman/BodyParts3D.git "$CLONE"
  git -C "$CLONE" config gc.auto 0
fi
for id in "${IDS[@]}"; do
  [ -s "$DEST/$id.stl" ] && { echo "have $id"; continue; }
  git -C "$CLONE" cat-file -p "HEAD:assets/BodyParts3D_data/stl/$id.stl" > "$DEST/$id.stl" && echo "got  $id"
done
# FMA ids for other muscles live in the repo's parts list (assets/BodyParts3D_data/parts_list_e.txt): fetch it with
#   git -C pipeline/ext/bp3d cat-file -p HEAD:assets/BodyParts3D_data/parts_list_e.txt > pipeline/ext/parts_list_e.txt
