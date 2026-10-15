#!/bin/bash
# Usage: prepare-run.sh <RUN_DIR>
# Изолированная копия репозитория для одного прогона (методика раздел 1.1 + исключения документов с утечкой дефектов).
set -euo pipefail
SRC=/Users/vedmalex/work/pipeline.js_2_13
RUN="$1"
rm -rf "$RUN"; mkdir -p "$RUN"
rsync -a \
  --exclude node_modules --exclude .git --exclude .plan --exclude memory-bank \
  --exclude '*.verify.test.ts' --exclude 'lib/' \
  --exclude .llm-wiki --exclude .specstory --exclude benchmark --exclude rules --exclude custom_modes \
  --exclude 'requests.md' --exclude 'TODO*.md' --exclude 'CLAUDE.md' --exclude 'AGENTS.md' \
  --exclude 'README.old.md' --exclude npm.audit.log --exclude pics --exclude .cache \
  "$SRC"/ "$RUN"/
ln -s "$SRC/node_modules" "$RUN/node_modules"
cp -R "$SRC/.git" "$RUN/.git"
