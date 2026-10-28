#!/bin/sh
# Opens preview.html in the default browser with the questions in the URL hash. macOS `open` drops a hash from a file
# URL, so this writes a one-line launcher page in $TMPDIR and opens that; the browser follows the redirect with the hash.
# usage: sh preview.sh 'card-layout,bento-grid,carousel;tabs,accordion' ko '빵집 사이트'
dir=$(cd "$(dirname "$0")" && pwd)
q=$1; lang=${2:-en}; title=${3:-ui-picker}
if command -v python3 >/dev/null 2>&1; then
  title=$(python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1]))' "$title")
fi
url="file://$dir/preview.html#q=$q&lang=$lang&title=$title"
f="${TMPDIR:-/tmp}/ui-picker-ask.html"
printf '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=%s">' "$url" > "$f"
if command -v open >/dev/null 2>&1; then open "$f"
elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$f" >/dev/null 2>&1
else echo "$url"; fi
