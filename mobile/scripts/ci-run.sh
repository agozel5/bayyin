#!/usr/bin/env bash
# Lance une commande de compilation ; en cas d'échec, résume l'erreur en annotation GitHub
# (visible sans se connecter, dans la page du workflow).
#   scripts/ci-run.sh "Titre" commande arg1 arg2…
title="$1"; shift
log="$(mktemp)"
set -o pipefail
"$@" 2>&1 | tee "$log"
status=${PIPESTATUS[0]}
if [ "$status" -ne 0 ]; then
  {
    grep -iE "error|failed|cannot|unable|not found|exception|wrong" "$log" | grep -v "^\s*at " | head -40
    echo "----- fin du journal -----"
    tail -n 40 "$log"
  } | cut -c1-300 > "$log.short"
  body="$(sed -e 's/%/%25/g' "$log.short" | awk '{printf "%s%%0A", $0}')"
  echo "::error title=${title}::${body}"
fi
exit "$status"
