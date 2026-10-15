---
node: /Users/vedmalex/work/pipeline.js_2_13/.llm-wiki
title: "Compiled Executor — IR / opcodes / VM / perf (blueprint для native)"
type: summary
slug: pipeline-js-compiled-executor
source: compiled-executor-roadmap
created: 2026-06-11
sources:
  - src/compiled/executor.ts
  - src/compiled/compiler.ts
  - src/compiled/plan.ts
  - memory-bank/docs/compiled-executor-roadmap.md
---

# Compiled Executor — IR / opcodes / VM

> ⚠️ **Unshipped:** живёт только в worktree `src/compiled/` (uncommitted/unmerged). grainjs его НЕ получает (см. `[[pipeline-js-overview]]`). Здесь — потому что это **прямой blueprint для native-VM** grainjs-ядра.

## Что это
`Pipeline.compile()` лоуэрит boundary-free stage-граф в **плоский op-array `PlanOp[]`**, исполняемый итеративным trampoline-VM `executeCompiledPlanLoop` (`src/compiled/executor.ts`), заменяя рекурсивный `run_or_execute` closure-dispatch. Gated `PIPELINE_USE_COMPILED`/`auto` (auto → compiled по умолчанию); при ошибке компиляции — fallback на легаси async-loop. Stack-safety через `queueMicrotask` на dispatch-depth 128.

## Opcode-set (`plan.ts`, post-TASK-027 — все Implemented)
`RUN_STAGE_FN` (**8 precomputed signature-kinds**, классифицированы на compile-time из `fn.length`+is_async), `RUN_STAGE_INSTANCE` (boundary-bearing Stage), `RUN_FALLBACK_STAGE` (semantic-boundary islands / hybrid), `SET_CTX_FROM_RESULT`, `JUMP`, `JUMP_IF_TRUE`, `PUSH_FRAME`/`POP_FRAME` (SCOPE/WRAP/SEQUENTIAL/LOOP/RETRY/TIMEOUT/PARALLEL-фреймы), `RUN_SEQUENTIAL`/`RUN_LOOP`/`RUN_RETRY`/`RUN_TIMEOUT`/`RUN_PARALLEL`, `RETURN`. Side-tables `PlanTables`: `stageFns`, `stageFnKinds`, `predicates`, `transforms`, `combiners` (**reserved/unused**), `constants`.

## Future-work (reserved, ещё НЕ реализовано)
- **`CALL_SUBPLAN`/`SUBPLAN_RETURN`** — reserved-но-stubbed (`ERR_OPCODE_NOT_IMPL`): nested compiled subplans без synthetic-wrapper-runners. **TASK-030 investigation [~]** — evidence-first, 4 гейта (bottleneck-attribution / cluster-coverage / variance-visibility / alternative-comparison) до того, как объявить это правильным следующим шагом.
- **Portable serialized plans** — текущий план = **in-memory runtime-артефакт** (`PlanMetadata.artifactKind=in-memory-runtime-plan`); build-time/serialized формата НЕТ.
- **True forced cancellation** — сегодня только `AbortSignal` delivery (cooperative), без принудительной отмены active-work.

## Перф (median-based, post-TASK-027; methodology — single-machine, low-sample, no CI → indicative)
- **Cluster A (batch=100):** compiled ~**34.8%** быстрее; direct-compiled ещё быстрее.
- **Cluster B (HTTP/wrapper-heavy):** Timeout ~**42.8%**↑, Wrap ~**53.0%**↑.
- **Cluster C (CLI/bootstrap):** warm ~**37.7%**↑; **cold one-shot МЕДЛЕННЕЕ** (compile-cost доминирует) — tracked как отдельная INFORMATIONAL-метрика, НЕ в warm-promotion-gate.
- **Synthetic:** compiled-static slope ~**0.045** vs legacy **0.118** µs/stage; compiled-hybrid ~**0.058** vs legacy **0.331** µs/stage.
- **Caution:** остаточный риск — variance/outlier в hybrid-synthetic-lanes (медианы выигрывают, max-спайки). Подозрительная Cluster-D-регрессия (20 items) НЕ воспроизвелась на variance-visible-rerun.
- **Тест:** `bun test` 471 pass / 1 fail (`retryonerror` «restores nested plain-object state between retries», timeout) — flaky-vs-fixed unknown.

## Critic gap-closure constraints (зафиксированы как roadmap-rules)
1. Hybrid direct-path perf = **gated requirement** (milestone done только если не регрессирует synthetic wrapper-heavy lane).
2. Error-propagation contract фиксирован ДО новых boundary-primitives: phase-1 гарантирует **только** sequential success/error short-circuit; `Stage.execute()` остаётся семантической границей для `ensure/validate/rescue/timeout`; compiled-планы сохраняют observable-parity, не заменяют тихо.
3. Hybrid-fallback boundary-тесты обязательны (sync-throw, async-reject, callback-error, double-callback, rescue-modified-ctx, ensure/validate через границу).
4. Benchmark-variance нормализована (multi-run медианы + min/max visible).

## Native-implications
flat `PlanOp[]` по program-counter + `ExecutionState` с явным `frameStack` (не JS call-stack) + замыкания в side-tables + devirtualized `RUN_STAGE_FN` (8 kinds) = **idiomatic bytecode-interpreter**, который native-runtime может зеркалить или **precompute на BUILD-time** (обходя cold-path-регрессию one-shot-пайплайнов grainjs boot/codegen/export). ТРИ ограничения: (1) портативного формата плана нет; (2) листья = JS-замыкания → native исполняет только dispatch-скелет+метаданные, тела стадий — call-back в JS или отдельная native-authoring-модель; (3) concurrency = single-thread microtask-suspension → native event-loop должен воспроизвести JS-microtask-ordering для observable-parity. trampoline-microtask-deferral-at-128 — JS-stack-safety-workaround, native не нужен. Cancellation: worktree cooperative, shipped baseline = НЕТ → решить явно.

## Связанные
- `[[pipeline-js-overview]]` · `[[pipeline-js-semantic-contracts]]` · `[[grainjs-async-libs]]` · `[[grainjs-native-core]]` (parent-node grainjs)
