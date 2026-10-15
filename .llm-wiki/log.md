<!-- Template for llm-wiki-* family. Authored under TASK-357. Substituted by skills/llm-wiki-init/scripts/init-node.ts. -->
---
node: /Users/vedmalex/work/pipeline.js_2_13/.llm-wiki
---

# Operation Log — .llm-wiki

Append-only. Newest entries at top. Do not edit past entries.

Entry format (spec-aligned, grep-friendly):
## [YYYY-MM-DD] type | title

<body paragraph>

Backward parser also accepts old bullet format during transition.

Types: init | ingest | query | maintain | migrate | remove

<!-- Entries appended below by llm-wiki-* skills -->
## [2026-06-11] init | node created at .llm-wiki

Node initialized at /Users/vedmalex/work/pipeline.js_2_13/.llm-wiki. Service files: AGENTS.md, CLAUDE.md, index.md, log.md, sources.md, questions.md, health.md.
## [2026-06-11] init | intake-evidence applied (174c93cb-8450-4bc2-82e0-944ebc070bd3)

Intake evidence session_id=174c93cb-8450-4bc2-82e0-944ebc070bd3 applied.
## [2026-06-11] ingest | roadmap.md

Source: file (symlink mode). Registered as roadmap-rm001 in sources.md. Raw path: raw/roadmap-rm001.
## [2026-06-11] ingest | compiled-executor-roadmap.md

Source: file (symlink mode). Registered as compiled-executor-roadmap in sources.md. Raw path: raw/compiled-executor-roadmap.
## [2026-06-11] ingest | flow-control-primitives-adaptation-conclusion.md

Source: file (symlink mode). Registered as flow-control-adoption in sources.md. Raw path: raw/flow-control-adoption.
## [2026-06-11] ingest | context-contract-spec.md

Source: file (symlink mode). Registered as context-contract-spec in sources.md. Raw path: raw/context-contract-spec.
## [2026-06-11] ingest | mws-semantic-spec.md

Source: file (symlink mode). Registered as mws-semantic-spec in sources.md. Raw path: raw/mws-semantic-spec.
## [2026-06-11] ingest | migration-policy-spec.md

Source: file (symlink mode). Registered as migration-policy-spec in sources.md. Raw path: raw/migration-policy-spec.

## [2026-06-11] node-init + ingest | pipeline.js wiki node

Нода инициализирована во внешнем worktree /Users/vedmalex/work/pipeline.js_2_13/.llm-wiki (parent = grainjs .llm-wiki, зарегистрирована в registry; parent-integration both → AGENTS.md/CLAUDE.md репо). Решение принято по рекомендации cluster-D synthesis+critic (high): pipeline.js — независимый проект с собственным MB3 memory-bank и grainjs-независимым roadmap RM-001. Ingest scope = SUMMARIZE memory-bank (6 source-доков symlinked: roadmap.md, compiled-executor-roadmap.md, flow-control-primitives-adaptation-conclusion.md, context-contract-spec.md, mws-semantic-spec.md, migration-policy-spec.md); НЕ ингестированы 53KB tasks.md + JSONL-реестры (operational state). Stage 2: created 3 pages — pipeline-js-overview (модель Stage/Pipeline, two-mode Context, RM-001 статус Phases1-3 done/Phase4 in-progress, 🔴 shipped 2.0.33 легаси vs unshipped compiled-executor), pipeline-js-compiled-executor (IR/opcode-set/trampoline-VM, perf 34.8%/42.8%/53.0% но cold-one-shot медленнее, CALL_SUBPLAN reserved, native-VM blueprint), pipeline-js-semantic-contracts (Context two-mode Track1.3, MWS Track1.4, migration Track1.5, flow-control adoption). Wikilinks к grainjs-side [[grainjs-async-libs]]/[[grainjs-native-core]]. index.md built.
## [2026-06-11] maintain | lint pass — 4 finding(s)

Findings: 4 total (ERROR:0 WARN:4 INFO:0).
## [2026-06-11] maintain | lint pass — 4 finding(s)

Findings: 4 total (ERROR:0 WARN:4 INFO:0).
