#!/usr/bin/env bash
# Lance une commande de compilation ; en cas d'échec, résume l'erreur en annotation GitHub
# (visible sans se connecter, dans la page du workflow).
#   scripts/ci-run.sh "Titre" commande arg1 arg2…
title="$1"; shift
log="$(mktemp)"
set -o pipefail
# CI_TIMEOUT (ex. 90m) : arrête une étape bloquée en gardant la fin du journal dans l'annotation
if [ -n "$CI_TIMEOUT" ]; then timeout --signal=INT "$CI_TIMEOUT" "$@" 2>&1 | tee "$log"; else "$@" 2>&1 | tee "$log"; fi
status=${PIPESTATUS[0]}
if [ "$status" -ne 0 ]; then
  # Les barres de progression (curl, gradle) réécrivent la ligne avec \r : on les retire
  tr '\r' '\n' < "$log" | grep -vE "^ *[0-9]+ +[0-9.]+[kMG]? +[0-9]+|% Total|Dload" > "$log.clean"
  {
    grep -iE "\[!\]|error|failed|cannot|unable|not found|exception|wrong|invalid" "$log.clean" | grep -v "^\s*at " | grep -v "building from source" | head -40
    echo "----- fin du journal -----"
    tail -n 30 "$log.clean"
  } | cut -c1-300 > "$log.short"
  body="$(sed -e 's/%/%25/g' "$log.short" | awk '{printf "%s%%0A", $0}')"
  echo "::error title=${title}::${body}"
fi
exit "$status"
