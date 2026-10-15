#!/bin/bash
# Prepare isolated RUN dirs for every model (cells S and P) and record pristine fingerprint + bun test baseline.
# Usage: prepare-all.sh <model-id>
set -uo pipefail
BENCH=/Users/vedmalex/work/pipeline.js_2_13/.plan/lv-bench
MODEL="$1"; NAME="${MODEL#opencode/}"
REP=/private/tmp/lv-bench/reports
for CELL in S P; do
  RUN="/private/tmp/lv-bench/${NAME}-${CELL}-1"
  "$BENCH/prepare-run.sh" "$RUN" || { echo "PREP_FAIL $NAME $CELL"; continue; }
  (cd "$RUN" && find src -type f ! -name '*.verify.test.ts' -print0 | sort -z | xargs -0 shasum | shasum | cut -d' ' -f1) > "$REP/fp-${NAME}-${CELL}-1.txt"
  BASE=$(cd "$RUN" && bun test 2>&1 | grep -E '^ [0-9]+ (pass|fail)' | tr -s ' ' | tr '\n' ' ')
  echo "$NAME $CELL baseline: $BASE" >> "$REP/baseline.txt"
done
