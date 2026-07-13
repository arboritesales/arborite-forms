#!/bin/sh
# Regenerates js/app.js from the source modules in js/modules/, in the exact
# order listed in js/modules/build-order.txt. Run this after editing ANY file
# in js/modules/ — the app itself only ever loads the single js/app.js, so an
# edit to a module file has no effect on the running app until this is run.
set -e
cd "$(dirname "$0")"
: > js/app.js
while IFS= read -r module; do
  [ -z "$module" ] && continue
  cat "js/modules/$module" >> js/app.js
done < js/modules/build-order.txt
echo "Rebuilt js/app.js from $(wc -l < js/modules/build-order.txt) modules ($(wc -l < js/app.js) lines total)."
